import axios from "axios";

const API_URL = "https://localhost:7003/api/Device";

export const getDevices = () => axios.get(API_URL);
export const addDevice = (device) => axios.post(API_URL, device);
export const deleteDevice = (id) => axios.delete(`${API_URL}/${id}`);
export const updateDevice = (id, device) => axios.put(`${API_URL}/${id}`, device);
