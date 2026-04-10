import Incident from "../models/incident.js";
import Ambulance from "../models/ambulance.js";
import Patient from "../models/patient.js";
import FirstResponder from "../models/firstResponder.js";
import { assignAmbulanceToIncident } from "../services/dispatchService.js";
import { getIO } from "../services/socket.js";

export const getQueue = async (req, res) => {
  try {
    const incidents = await Incident.find({ status: "new" })
      .sort({ createdAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital");

    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const assignAmbulance = async (req, res) => {
  try {
    const { incidentId, priority, ambulanceType, ambulanceId, dispatcherNotes, pingFirstResponders } = req.body;

    if (!incidentId) {
      return res.status(400).json({ error: "Incident ID is required" });
    }

    let incident = await assignAmbulanceToIncident({
      incidentId,
      priority,
      ambulanceType,
      ambulanceId,
      dispatcherNotes,
    });

    if (pingFirstResponders) {
      // Find nearby responders (within 1km)
      const nearbyResponders = await FirstResponder.find({
        status: "available",
        currentLocation: {
          $near: {
            $geometry: { type: "Point", coordinates: [incident.location.lng, incident.location.lat] },
            $maxDistance: 1000,
          },
        },
      }).limit(5);

      const responderIds = nearbyResponders.map((r) => r._id);
      
      incident = await Incident.findByIdAndUpdate(
        incidentId,
        { firstRespondersPinged: responderIds },
        { new: true }
      ).populate("assignedAmbulance")
       .populate("assignedHospital")
       .populate("firstRespondersPinged")
       .populate("firstResponderAssigned");

      const io = getIO();
      if (io) {
        // Emit that FRs were pinged
        io.emit("firstRespondersPinged", incident);

        // Simulate 4 seconds later: one of the pinged responders accepts
        if (nearbyResponders.length > 0) {
          setTimeout(async () => {
             try {
               const acceptedResponderId = nearbyResponders[0]._id;
               await FirstResponder.findByIdAndUpdate(acceptedResponderId, { status: "responding" });
               const updatedInc = await Incident.findByIdAndUpdate(
                 incidentId,
                 { firstResponderAssigned: acceptedResponderId, "status": "en_route" }, // Assume FR response sets case to en_route
                 { new: true }
               ).populate("assignedAmbulance")
                .populate("assignedHospital")
                .populate("firstRespondersPinged")
                .populate("firstResponderAssigned");
               
               io.emit("firstResponderAccepted", updatedInc);
               io.emit("incidentStatusUpdate", updatedInc);
             } catch (e) {
               console.error("Simulation error", e);
             }
          }, 4000);
        }
      }
    }

    res.json(incident);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const checkFirstResponders = async (req, res) => {
  try {
    const { lat, lng, radius = 1000 } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat/lng" });
    }

    const nearbyResponders = await FirstResponder.find({
      status: "available",
      currentLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius), // 1km in metres
        },
      },
    }).limit(5);

    res.json(nearbyResponders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const allowedStatuses = [
      "dispatched",
      "en_route",
      "on_scene",
      "transporting",
      "at_hospital",
      "closed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const incident = await Incident.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("assignedAmbulance")
      .populate("assignedHospital")
      .populate("patient");

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    if (incident.assignedAmbulance && ["at_hospital", "closed"].includes(status)) {
      await Ambulance.findByIdAndUpdate(incident.assignedAmbulance._id, {
        status: "available",
      });
    }

    const io = getIO();
    if (io) {
      io.emit("incidentStatusUpdate", incident);
    }

    res.json(incident);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getActiveIncidentForAmbulance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Ambulance ID is required" });
    }

    const incident = await Incident.findOne({
      assignedAmbulance: id,
      status: { $in: ["dispatched", "en_route", "on_scene", "transporting"] },
    })
      .sort({ updatedAt: -1 })
      .populate("assignedAmbulance")
      .populate("assignedHospital")
      .populate("patient")
      .populate("hospitalOptions.hospital");

    if (!incident) {
      return res.json(null);
    }

    res.json(incident);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateIncidentHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { hospitalId } = req.body;

    if (!hospitalId) {
      return res.status(400).json({ error: "Hospital ID is required" });
    }

    const incident = await Incident.findById(id).populate("patient");
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    incident.assignedHospital = hospitalId;
    await incident.save();

    if (incident.patient) {
      await Patient.findByIdAndUpdate(incident.patient._id, {
        hospital: hospitalId,
      });
    }

    const updated = await Incident.findById(incident._id)
      .populate("assignedAmbulance")
      .populate("assignedHospital")
      .populate("patient")
      .populate("hospitalOptions.hospital");

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
