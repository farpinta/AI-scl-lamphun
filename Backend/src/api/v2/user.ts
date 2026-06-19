import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { and, eq, ne } from 'drizzle-orm/sql/expressions/conditions'
import { db } from '../..'
import { deviceOwners, devices, users } from '../../db/schema'

const getBearerToken = (authHeader?: string) => {
	if (!authHeader) return null
	const [scheme, token] = authHeader.split(' ')
	if (scheme !== 'Bearer' || !token) return null
	return token
}

const userUpdateResponseSchema = t.Object({
	code: t.Number(),
	message: t.String()
})

const userOwnsResponseSchema = t.Object({
	deviceInfo: t.Array(
		t.Object({
			monitorName: t.String(),
			customName: t.String(),
			deviceLocation: t.Object({
				latitude: t.String(),
				longtitude: t.String()
			})
		})
	)
})

export const userRoutes = new Elysia({
	prefix: '/api/v2/user'
})
	.use(
		jwt({
			name: 'jwt',
			secret: process.env.JWT_SECRET ?? 'change-me'
		})
	)
	.get(
		'/owns',
		async ({ headers, jwt, set }) => {
			const token = getBearerToken(headers.authorization)

			if (!token) {
				set.status = 401
				return {
					deviceInfo: []
				}
			}

			const payload = await jwt.verify(token).catch(() => null)

			if (!payload || typeof payload.id !== 'number') {
				set.status = 401
				return {
					deviceInfo: []
				}
			}

			const database = await db
			const rows = await database
				.select({
					monitorName: devices.monitorItem,
					customName: devices.customName,
					latitude: devices.latitude,
					longtitude: devices.longitude
				})
				.from(deviceOwners)
				.innerJoin(devices, eq(deviceOwners.deviceId, devices.id))
				.where(eq(deviceOwners.userId, payload.id))

			return {
				deviceInfo: rows.map((row) => ({
					monitorName: row.monitorName ?? '',
					customName: row.customName ?? '',
					deviceLocation: {
						latitude: row.latitude ?? '',
						longtitude: row.longtitude ?? ''
					}
				}))
			}
		},
		{
			headers: t.Object({
				authorization: t.String()
			}),
			response: userOwnsResponseSchema
		}
	)
	.put(
		'/',
		async ({ body, headers, jwt }) => {
			const token = getBearerToken(headers.authorization)

			if (!token) {
				return {
					code: 401,
					message: 'Missing Authorization header'
				}
			}

			const payload = await jwt.verify(token).catch(() => null)

            if (!payload) {
                return {
                    code: 401,
                    message: 'Invalid or expired token'
                }
            }

			const updatePayload: {
				firstname?: string
				lastname?: string
				username?: string
				email?: string
			} = {}

			if (body.firstname) updatePayload.firstname = body.firstname
			if (body.lastname) updatePayload.lastname = body.lastname
			if (body.username) updatePayload.username = body.username
			if (body.email) updatePayload.email = body.email

			if (Object.keys(updatePayload).length === 0) {
				return {
					code: 400,
					message: 'No fields to update'
				}
			}

			const database = await db

			const existingUser = await database
				.select()
				.from(users)
				.where(eq(users.id, body.id))
				.limit(1)

			if (existingUser.length === 0) {
				return {
					code: 404,
					message: 'User not found'
				}
			}

			if (body.username) {
				const usernameTaken = await database
					.select()
					.from(users)
					.where(and(eq(users.username, body.username), ne(users.id, body.id)))
					.limit(1)

				if (usernameTaken.length > 0) {
					return {
						code: 409,
						message: 'Username already exists'
					}
				}
			}

			if (body.email) {
				const emailTaken = await database
					.select()
					.from(users)
					.where(and(eq(users.email, body.email), ne(users.id, body.id)))
					.limit(1)

				if (emailTaken.length > 0) {
					return {
						code: 409,
						message: 'Email already exists'
					}
				}
			}

			try {
				await database.update(users).set(updatePayload).where(eq(users.id, body.id))
			} catch (error) {
				const pgError = error as { code?: string }
				if (pgError.code === '23505') {
					return {
						code: 409,
						message: 'Username or email already exists'
					}
				}
				throw error
			}

			return {
				code: 200,
				message: 'ok'
			}
		},
		{
			headers: t.Object({
				authorization: t.String()
			}),
			body: t.Object({
				id: t.Number(),
				firstname: t.Optional(t.String()),
				lastname: t.Optional(t.String()),
				username: t.Optional(t.String()),
				email: t.Optional(t.String({ format: 'email' }))
			}),
			response: userUpdateResponseSchema
		}
	)
