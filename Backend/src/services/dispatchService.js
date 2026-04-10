import Ambulance from "../models/ambulance.js";
import Incident from "../models/incident.js";
import { calculateDistanceKm } from "../utils/geoUtils.js";

const selectNearestAmbulance = (ambulances, incidentLocation) => {
  if (!incidentLocation?.lat || !incidentLocation?.lng) return ambulances[0];

  let best = ambulances[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const ambulance of ambulances) {
    const { lat, lng } = ambulance.currentLocation || {};
    if (lat == null || lng == null) continue;

    const distance = calculateDistanceKm(
      incidentLocation.lat,
      incidentLocation.lng,
      lat,
      lng
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = ambulance;
    }
  }

  return best;
};

export const assignAmbulanceToIncident = async ({
  incidentId,
  priority,
  ambulanceType,
  ambulanceId,
  dispatcherNotes,
}) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new Error("Incident not found");
  }

  let ambulance = null;

  if (ambulanceId) {
    ambulance = await Ambulance.findOne({
      _id: ambulanceId,
      status: "available",
      isActive: true,
    });
  }

  if (!ambulance) {
    const query = {
      status: "available",
      isActive: true,
    };

    if (ambulanceType) {
      query.serviceLevel = ambulanceType;
    }

    const available = await Ambulance.find(query);
    if (!available.length) {
      throw new Error("No available ambulances");
    }

    ambulance = selectNearestAmbulance(available, incident.location);
  }

  incident.priority = priority || incident.priority;
  incident.ambulanceType = ambulanceType || incident.ambulanceType;
  incident.assignedAmbulance = ambulance._id;
  incident.dispatcherNotes = dispatcherNotes || incident.dispatcherNotes;
  incident.status = "dispatched";

  await incident.save();

  ambulance.status = "on-duty";
  await ambulance.save();

  return Incident.findById(incident._id)
    .populate("assignedAmbulance")
    .populate("assignedHospital");
};
