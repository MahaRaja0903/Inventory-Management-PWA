import axios from 'axios';

const FRAPPE_URL = 'https://admin.dreamtechsolution.com/api/resource';
const FRAPPE_METHOD_URL = 'https://admin.dreamtechsolution.com/api/method';
const FRAPPE_TOKEN = 'token f069923bef04378:a34779c3b22868f';

const headers = {
  'Authorization': FRAPPE_TOKEN,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Authenticate a user directly with Frappe's native login.
 */
export async function frappeLogin(usr: string, pwd: string): Promise<boolean> {
  try {
    const response = await axios.post(`${FRAPPE_METHOD_URL}/login`, { usr, pwd });
    return response.status === 200 && response.data.message === 'Logged In';
  } catch (error) {
    return false; // Login failed
  }
}

/**
 * Helper to fetch a list of documents from Frappe.
 */
export async function getFrappeDocs(docType: string, filters?: any, fields: string[] = ['*']): Promise<any[]> {
  try {
    const params: any = {
      fields: JSON.stringify(fields),
      limit_page_length: 1000 // default max
    };
    if (filters) {
      params.filters = JSON.stringify(filters);
    }
    
    const response = await axios.get(`${FRAPPE_URL}/${docType}`, {
      headers,
      params
    });
    return response.data.data || [];
  } catch (error: any) {
    console.error(`Error fetching ${docType} from Frappe:`, error.response?.data || error.message);
    throw new Error(`Failed to fetch ${docType} from Frappe`);
  }
}

/**
 * Helper to fetch a single document from Frappe by Name (ID).
 */
export async function getFrappeDoc(docType: string, name: string): Promise<any> {
  try {
    const response = await axios.get(`${FRAPPE_URL}/${docType}/${name}`, { headers });
    return response.data.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) return null;
    console.error(`Error fetching ${docType} ${name} from Frappe:`, error.response?.data || error.message);
    throw new Error(`Failed to fetch ${docType}`);
  }
}

/**
 * Helper to create a new document in Frappe.
 */
export async function createFrappeDoc(docType: string, data: any): Promise<any> {
  try {
    const response = await axios.post(`${FRAPPE_URL}/${docType}`, data, { headers });
    return response.data.data;
  } catch (error: any) {
    const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`Error creating ${docType} in Frappe:`, details);
    throw new Error(`Failed to create ${docType}: ${details}`);
  }
}

/**
 * Helper to update an existing document in Frappe.
 */
export async function updateFrappeDoc(docType: string, name: string, data: any): Promise<any> {
  try {
    const response = await axios.put(`${FRAPPE_URL}/${docType}/${name}`, data, { headers });
    return response.data.data;
  } catch (error: any) {
    const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`Error updating ${docType} ${name} in Frappe:`, details);
    throw new Error(`Failed to update ${docType}: ${details}`);
  }
}

/**
 * Helper to delete a document in Frappe.
 */
export async function deleteFrappeDoc(docType: string, name: string): Promise<boolean> {
  try {
    await axios.delete(`${FRAPPE_URL}/${docType}/${name}`, { headers });
    return true;
  } catch (error: any) {
    console.error(`Error deleting ${docType} ${name} from Frappe:`, error.response?.data || error.message);
    throw new Error(`Failed to delete ${docType}`);
  }
}
