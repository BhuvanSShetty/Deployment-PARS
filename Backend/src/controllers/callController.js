import Incident from "../models/incident.js";
import { getIO } from "../services/socket.js";

export const createCall = async (req, res) => {
  try {
    const {
      patientName,
      patientAge,
      patientSex,
      callerPhone,
      chiefComplaint,
      symptoms,
      location,
    } = req.body;

    if (!chiefComplaint || !location?.lat || !location?.lng) {
      return res.status(400).json({ error: "Chief complaint and location are required" });
    }

    const incident = await Incident.create({
      patientName,
      patientAge,
      patientSex,
      callerPhone,
      chiefComplaint,
      symptoms: symptoms || [],
      location,
    });

    const io = getIO();
    if (io) {
      io.emit("newCall", incident);
    }

    res.status(201).json(incident);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
