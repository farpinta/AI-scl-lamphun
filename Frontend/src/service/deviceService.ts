
export interface DeviceLatestResponse {
  code: number;
  monitorValue: string;
  monitorTime: string;
}

export interface DeviceRangeData {
  monitorValue: string;
  monitorTime: string;
}

export interface DeviceRangeResponse {
  code: number;
  data: DeviceRangeData[];
}

export interface DeviceInfoResponse {
  monitorName: string;
  customName: string;
  warningLevel: number;
  deviceLocation: {
    latitude: string;
    longitude: string;
  };
}

// 2. Helper Functions
const API_BASE_URL = '/api/v2/device';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

export const DeviceService = {
  
  // ดึงค่าล่าสุด (Real-time)
  getLatest: async (deviceId: string, deviceSecretKey: string, monitorItem: string): Promise<DeviceLatestResponse> => {
    const response = await fetch(`${API_BASE_URL}/latest`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ deviceId, deviceSecretKey, monitorItem }),
    });
    return handleResponse(response);
  },

  // ดึงค่าย้อนหลัง (History)
  getHistory: async (
    deviceId: string, 
    deviceSecretKey: string, 
    monitorItem: string,
    start: number, 
    end: number
  ): Promise<DeviceRangeData[]> => {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        deviceId, 
        deviceSecretKey, 
        monitorItem,
        start, 
        end 
      }),
    });
    // Backend ส่งกลับมาเป็น object { code, data: [...] } เราดึงเอาแค่ data ไปใช้
    const json: DeviceRangeResponse = await handleResponse(response);
    return json.data; 
  },

  getStationInfo: async (deviceId: string): Promise<DeviceInfoResponse> => {
    const response = await fetch('/api/v2/device/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ deviceId }),
    });
    
    if (!response.ok) {
       throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }
};

export const MockDeviceService = {
  getStationInfo: async (deviceId: string): Promise<DeviceInfoResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      monitorName: "MOCK-001",
      customName: "Mockup Station (ลำพูน)",
      warningLevel: 1, 
      deviceLocation: {
        latitude: "18.575",
        longitude: "99.008"
      }
    };
  },

  // 2. จำลองข้อมูลย้อนหลัง (History)
  getHistory: async (
    deviceId: string, 
    deviceSecretKey: string, 
    monitorItem: string, 
    start: number, 
    end: number
  ): Promise<DeviceRangeData[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockData: DeviceRangeData[] = [];
    const oneHour = 60 * 60 * 1000;
    
    // สร้างข้อมูลย้อนหลัง 24 จุด (24 ชั่วโมง)
    for (let i = 0; i < 24; i++) {
      const time = end - (i * oneHour);
      
      // สุ่มค่าตัวเลขให้ดูสมจริง
      let value = 0;
      if (monitorItem === "water_level") {
         // ระดับน้ำสมมติ: แกว่งๆ แถวๆ 4.5 - 5.5 เมตร
         value = 4.5 + Math.random(); 
      } else {
         // ปริมาณฝนสมมติ: สุ่ม 0 - 20 mm
         value = Math.random() > 0.7 ? Math.random() * 20 : 0; 
      }

      mockData.push({
        monitorTime: new Date(time).toISOString(), // ส่งกลับเป็น ISO String
        monitorValue: value.toFixed(2)
      });
    }

    return mockData;
  }
};
