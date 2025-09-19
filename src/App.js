import { useEffect, useState } from "react";
import { getDevices, addDevice, deleteDevice, updateDevice } from "./services/deviceService";
import * as signalR from "@microsoft/signalr"; // import SignalR client
import "./App.css";

function App() {
  const [devices, setDevices] = useState([]);
  const [newDevice, setNewDevice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Track input focus for validation
  const [touched, setTouched] = useState(false);
  const [editTouched, setEditTouched] = useState(false);

  const [toasts, setToasts] = useState([]); // array of notifications

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // devices per page

  const [connectionStatus, setConnectionStatus] = useState("disconnected"); 

  const MAX_DEVICE_NAME_LENGTH = 100;

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await getDevices();
      const data = (response.data || []).map((d) => ({
        id: d.Id,
        deviceName: d.DeviceName,
        description: d.Description || "No description",
      }));
      setDevices(data);
    } catch (err) {
      console.error(err);
      setAddError("Failed to load devices. Please try again later.");
      setDevices([]);
    }
  };

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

// setup signalR connection
useEffect(() => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7003/deviceHub")
    .withAutomaticReconnect() // add retries
    .build();

  connection.on("ReceiveNotification", async (message) => {
    console.log("SignalR message:", message);

    if (message.toLowerCase().includes("added")) {
      showToast("added", message);
    } else if (message.toLowerCase().includes("updated")) {
      showToast("updated", message);
    } else if (message.toLowerCase().includes("deleted")) {
      showToast("deleted", message);
    } else {
      showToast("info", message);
    }

    try {
      await loadDevices();
    } catch (err) {
      showToast("error", "Failed to refresh devices");
    }
  });

  // Lifecycle events
  connection.onreconnecting(() => {
    setConnectionStatus("reconnecting");
    showToast("info", "Reconnecting to server...");
  });

  connection.onreconnected(() => {
    setConnectionStatus("connected");
    showToast("success", "Reconnected to server");
  });

  connection.onclose(() => {
    setConnectionStatus("disconnected");
    showToast("error", "Disconnected from server");
  });

  connection
    .start()
    .then(() => {
      console.log("Connected to SignalR hub");
      setConnectionStatus("connected");
    })
    .catch((err) => {
      console.error("SignalR Connection Error:", err);
      setConnectionStatus("disconnected");
    });

  return () => {
    connection.stop();
  };
}, []);


  // Auto-clear success & error messages after 3 seconds
  useEffect(() => {
    if (success || addError || editError) {
      const timer = setTimeout(() => {
        setSuccess("");
        setAddError("");
        setEditError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, addError, editError]);

  const validateName = (name, excludeId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return "Device name is required";
    if (trimmed.length > MAX_DEVICE_NAME_LENGTH)
      return `Device name cannot exceed ${MAX_DEVICE_NAME_LENGTH} characters`;
    if (/^\d+$/.test(trimmed)) return "Device name cannot be only numbers";
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed))
      return "Only letters, numbers, spaces, hyphens, and underscores allowed";
    if (!/[a-zA-Z0-9]/.test(trimmed))
      return "Device name must contain at least one letter or number";
    if (
      devices.some(
        (d) => d.deviceName.toLowerCase() === trimmed.toLowerCase() && d.id !== excludeId
      )
    )
      return "Device with this name already exists";
    return "";
  };

  const handleAdd = async () => {
    setTouched(true);
    const errMsg = validateName(newDevice);
    if (errMsg) {
      setAddError(errMsg);
      return;
    }
    try {
      await addDevice({
        deviceName: newDevice.trim(),
        description: newDescription.trim() || "No description",
      });
      setNewDevice("");
      setNewDescription("");
      setAddError("");
      setTouched(false);
      setCurrentPage(1);
      // Removed local toast → SignalR will show it
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.message || err.message || "Failed to add device");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    try {
      await deleteDevice(id);
      // Removed local toast → SignalR will show it
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.message || "Failed to delete device");
    }
  };

  const handleEdit = (d) => {
    setEditId(d.id);
    setEditName(d.deviceName);
    setEditDescription(d.description);
    setEditError("");
    setEditTouched(false);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditDescription("");
    setEditError("");
    setEditTouched(false);
  };

  const handleUpdate = async () => {
    setEditTouched(true);
    const errMsg = validateName(editName, editId);
    if (errMsg) {
      setEditError(errMsg);
      return;
    }
    try {
      await updateDevice(editId, {
        deviceName: editName.trim(),
        description: editDescription.trim() || "No description",
      });
      handleCancelEdit();
      // Removed local toast → SignalR will show it
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.message || err.message || "Failed to update device");
    }
  };

  // Filter + Pagination
  const filteredDevices = devices.filter((d) =>
    d.deviceName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredDevices.length / pageSize);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="container">
      <h1>Device Management System</h1>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>

      <div className="status-indicator">
      <span
    className={`status-dot ${connectionStatus}`}
    title={`SignalR: ${connectionStatus}`}
  ></span>
  {connectionStatus === "connected" && "Connected"}
  {connectionStatus === "reconnecting" && " Reconnecting..."}
  {connectionStatus === "disconnected" && " Disconnected"}
</div>

      {/* Add Form */}
      <div className="form">
        <div className="form-group">
          <label>Device Name</label>
          <input
            type="text"
            placeholder="Enter device name"
            value={newDevice}
            onChange={(e) => {
              setNewDevice(e.target.value);
              setAddError(validateName(e.target.value));
            }}
            onBlur={() => setTouched(true)}
            disabled={editId !== null}
          />
          {touched && addError && !editId && (
            <p className="inline-error">{addError}</p>
          )}
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
          disabled={editId !== null || !!addError}
        >
          Add Device
        </button>
      </div>

      {/* Search */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search devices..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Device List */}
      <ul className="device-list">
        {paginatedDevices.length === 0 ? (
          <p className="no-devices">No devices found</p>
        ) : (
          paginatedDevices.map((d) => (
            <li key={d.id} className="device-item">
              {editId === d.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditError(validateName(e.target.value, editId));
                    }}
                    onBlur={() => setEditTouched(true)}
                  />
                  {editTouched && editError && (
                    <p className="inline-error">{editError}</p>
                  )}
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <button
                    type="button"
                    className="save-btn"
                    onClick={handleUpdate}
                    disabled={!!editError || !editName.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleCancelEdit}
                  >
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
                    <button className="edit-btn" onClick={() => handleEdit(d)}>
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(d.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
