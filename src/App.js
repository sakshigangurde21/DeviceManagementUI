import { useEffect, useState } from "react";
import { getDevices, addDevice, deleteDevice, updateDevice } from "./services/deviceService";
import "./App.css";

function App() {
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const MAX_DEVICE_NAME_LENGTH = 100;

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await getDevices();
      setDevices(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load devices. Please try again later.");
    }
  };

  // Auto-clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Add new device
  const handleAdd = async () => {
    setError("");
    setSuccess("");

    const trimmedName = newDevice.trim();

    try {s
      if (!trimmedName) throw new Error("Device name is required");
      if (trimmedName.length > MAX_DEVICE_NAME_LENGTH)
        throw new Error(`Device name cannot exceed ${MAX_DEVICE_NAME_LENGTH} characters`);
      if (/^\d+$/.test(trimmedName))
        throw new Error("Device name cannot be only numbers");
      if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName))
        throw new Error("Device name can only contain letters, numbers, spaces, hyphens, or underscores");
      if (!/[a-zA-Z0-9]/.test(trimmedName))
        throw new Error("Device name must contain at least one letter or number");
      if (devices.some(d => d.deviceName.toLowerCase() === trimmedName.toLowerCase()))
        throw new Error("Device with this name already exists");

      const device = {
        deviceName: trimmedName,
        description: newDescription.trim() || "No description",
      };

      await addDevice(device);
      setSuccess("Device added successfully");
      setNewDevice("");
      setNewDescription("");
      loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to add device");
    }
  };

  // Delete device
  const handleDelete = async (id) => {
    setError("");
    setSuccess("");
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    try {
      await deleteDevice(id);
      setSuccess("Device deleted successfully");
      loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete device");
    }
  };

  // Start editing
  const handleEdit = (device) => {
    setEditId(device.id);
    setEditName(device.deviceName);
    setEditDescription(device.description);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditDescription("");
  };

  // Update device
  const handleUpdate = async () => {
    setError("");
    setSuccess("");

    const trimmedName = editName.trim();

    try {
      if (!trimmedName) throw new Error("Device name is required");
      if (trimmedName.length > MAX_DEVICE_NAME_LENGTH)
        throw new Error(`Device name cannot exceed ${MAX_DEVICE_NAME_LENGTH} characters`);
      if (/^\d+$/.test(trimmedName))
        throw new Error("Device name cannot be only numbers");
      if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName))
        throw new Error("Device name can only contain letters, numbers, spaces, hyphens, or underscores");
      if (!/[a-zA-Z0-9]/.test(trimmedName))
        throw new Error("Device name must contain at least one letter or number");
      if (devices.some(d => d.deviceName.toLowerCase() === trimmedName.toLowerCase() && d.id !== editId))
        throw new Error("Device with this name already exists");

      const updatedDevice = {
        deviceName: trimmedName,
        description: editDescription.trim() || "No description",
      };

      await updateDevice(editId, updatedDevice);
      setSuccess("Device updated successfully");
      setEditId(null);
      setEditName("");
      setEditDescription("");
      loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update device");
    }
  };

  // Filtered devices list
  const filteredDevices = devices.filter((d) =>
    d.deviceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <h1>Device Management System</h1>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Add Device Form */}
      <div className="form">
        <div className="form-group">
          <label>Device Name</label>
          <input
            type="text"
            placeholder="Enter device name"
            value={newDevice}
            onChange={(e) => setNewDevice(e.target.value)}
            disabled={editId !== null}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            placeholder="Enter description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={editId !== null}
          />
        </div>
        <button
          type="button"
          className="add-btn"
          onClick={handleAdd}
          disabled={editId !== null}
        >
          Add Device
        </button>
      </div>

      {/* Search Box */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search devices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Device List */}
      <ul className="device-list">
        {filteredDevices.length === 0 ? (
          <p className="no-devices">No devices found</p>
        ) : (
          filteredDevices.map((d) => (
            <li key={d.id} className="device-item">
              {editId === d.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <button type="button" className="save-btn" onClick={handleUpdate}>
                    Save
                  </button>
                  <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="device-info">
                    <strong>{d.deviceName}</strong>
                    <p>{d.description}</p>
                  </div>
                  <div className="device-actions">
                    <button className="edit-btn" onClick={() => handleEdit(d)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(d.id)}>Delete</button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default App;
