import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { db } from '../..'
import { sql } from 'drizzle-orm'
import { eq, or } from 'drizzle-orm/sql/expressions/conditions'
import { sessions, users } from '../../db/schema'

const accessExpiresInSeconds = Number(process.env.JWT_ACCESS_EXPIRES_SECONDS ?? 900)
const refreshExpiresInDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7)
const sessionLimit = Math.max(1, Number(process.env.LIMIT_SESSION ?? 2))

const getBearerToken = (authHeader?: string) => {
    if (!authHeader) return null
    const [scheme, token] = authHeader.split(' ')
    if (scheme !== 'Bearer' || !token) return null
    return token
}

const buildAccessPayload = (user: { id: number; username: string | null }) => ({
    id: user.id,
    username: user.username ?? '',
    exp: Math.floor(Date.now() / 1000) + accessExpiresInSeconds
})

const buildRefreshExpiry = () =>
    new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000).toISOString()

const authRoutes = new Elysia({
    prefix: '/api/v2/auth'
})
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET ?? 'change-me'
        })
    )
    .post(
        '/login',
        async ({ body, jwt }) => {
            const database = await db
            const { identifier, password } = body

            const userRecords = await database
                .select()
                .from(users)
                .where(
                    or(
                        eq(users.username, identifier),
                        eq(users.email, identifier)
                    )
                )
                .limit(1)

            if (userRecords.length === 0) {
                return new Response('User not found or password not set', { status: 404 })
            }

            const user = userRecords[0]
            const passwordHash = user.password

            if (!passwordHash) {
                return new Response('User not found or password not set', { status: 404 })
            }

            const valid = await Bun.password.verify(password, passwordHash)

            if (!valid) {
                return new Response('Invalid password', { status: 401 })
            }

            const accessToken = await jwt.sign(
                buildAccessPayload({
                    id: user.id,
                    username: user.username
                })
            )
            const refreshToken = crypto.randomUUID()
            const refreshExpiresAt = buildRefreshExpiry()

            await database.insert(sessions).values({
                userId: user.id,
                token: refreshToken,
                expires_at: refreshExpiresAt
            })

            await database.execute(
                sql`
                WITH keep AS (
                  SELECT id FROM sessions
                  WHERE user_id = ${user.id}
                  ORDER BY expires_at DESC
                  LIMIT ${sessionLimit}
                )
                DELETE FROM sessions
                WHERE user_id = ${user.id}
                AND id NOT IN (SELECT id FROM keep)
                `
            )

            return {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    username: user.username ?? ''
                }
            }
        },
        {
            body: t.Object({
                identifier: t.String(),
                password: t.String()
            })
        }
    )
    .post(
        '/register',
        async ({ body }) => {
            const database = await db
            const { firstname, lastname, username, email, role, password } = body

            const existing = await database
                .select()
                .from(users)
                .where(or(eq(users.email, email), eq(users.username, username)))
                .limit(1)

            if (existing.length > 0) {
                return new Response('User already exists', { status: 409 })
            }

            const hashedPassword = await Bun.password.hash(password)

            try {
                await database.insert(users).values({
                    firstname,
                    lastname,
                    username,
                    email,
                    role,
                    password: hashedPassword
                })
            } catch (error) {
                const pgError = error as { code?: string }
                if (pgError.code === '23505') {
                    return new Response('User already exists', { status: 409 })
                }
                throw error
            }

            return { success: true }
        },
        {
            body: t.Object({
                firstname: t.String(),
                lastname: t.String(),
                username: t.String(),
                email: t.String({ format: 'email' }),
                role: t.Enum({ user: 'user', admin: 'admin' }),
                password: t.String({ minLength: 8 })
            })
        }
    )
    .get(
        '/me',
        async ({ headers, jwt }) => {
            const database = await db
            const token = getBearerToken(headers.authorization)

            if (!token) {
                return new Response('Missing Authorization header', { status: 401 })
            }

            const payload = await jwt.verify(token)

            if (!payload || typeof payload.id !== 'number') {
                return new Response('Invalid token', { status: 401 })
            }

            const userRecords = await database
                .select()
                .from(users)
                .where(eq(users.id, payload.id))
                .limit(1)

            if (userRecords.length === 0) {
                return new Response('User not found', { status: 404 })
            }

            const user = userRecords[0]

            return {
                id: user.id,
                username: user.username ?? '',
                email: user.email
            }
        },
        {
            headers: t.Object({
                authorization: t.String()
            })
        }
    )
    .post(
        '/refresh',
        async ({ body, jwt }) => {
            const database = await db
            const { refreshToken } = body

            const sessionRecords = await database
                .select()
                .from(sessions)
                .where(eq(sessions.token, refreshToken))
                .limit(1)

            if (sessionRecords.length === 0) {
                return new Response('Refresh token not found', { status: 401 })
            }

            const session = sessionRecords[0]
            if (!session.expires_at) {
                await database.delete(sessions).where(eq(sessions.token, refreshToken))
                return new Response('Refresh token expired', { status: 401 })
            }

            const expiresAt = new Date(session.expires_at)

            if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
                await database.delete(sessions).where(eq(sessions.token, refreshToken))
                return new Response('Refresh token expired', { status: 401 })
            }

            const userRecords = await database
                .select()
                .from(users)
                .where(eq(users.id, session.userId))
                .limit(1)

            if (userRecords.length === 0) {
                return new Response('User not found', { status: 404 })
            }

            const user = userRecords[0]
            const accessToken = await jwt.sign(
                buildAccessPayload({
                    id: user.id,
                    username: user.username
                })
            )

            return { accessToken }
        },
        {
            body: t.Object({
                refreshToken: t.String()
            })
        }
    )
    .post(
        '/logout',
        async ({ headers, jwt }) => {
            const database = await db
            const token = getBearerToken(headers.authorization)

            if (!token) {
                return new Response('Missing Authorization header', { status: 401 })
            }

            const payload = await jwt.verify(token)

            if (!payload || typeof payload.id !== 'number') {
                return new Response('Invalid token', { status: 401 })
            }

            await database.delete(sessions).where(eq(sessions.userId, payload.id))

            return { success: true }
        },
        {
            headers: t.Object({
                authorization: t.String()
            })
        }
    )

export { authRoutes }
