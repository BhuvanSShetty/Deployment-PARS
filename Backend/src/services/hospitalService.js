import Hospital from "../models/hospital.js";
import { calculateDistanceKm } from "../utils/geoUtils.js";

export const selectHospital = async ({ incidentLocation, riskLevel, limit = 3 }) => {
  if (!incidentLocation?.lat || !incidentLocation?.lng) return null;

  const hospitals = await Hospital.find({ isActive: true });
  if (!hospitals.length) return null;

  const needsAdvancedCare = riskLevel <= 2;

  let candidates = hospitals;
  if (needsAdvancedCare) {
    const advanced = hospitals.filter((h) => h.capabilities?.trauma || h.capabilities?.icu);
    if (advanced.length) {
      candidates = advanced;
    }
  }

  const options = candidates.map((hospital) => {
    const distance = calculateDistanceKm(
      incidentLocation.lat,
      incidentLocation.lng,
      hospital.location.lat,
      hospital.location.lng
    );

    const capabilityPenalty = needsAdvancedCare && !hospital.capabilities?.icu ? 15 : 0;
    const score = distance + capabilityPenalty;
    const reason = needsAdvancedCare && (hospital.capabilities?.trauma || hospital.capabilities?.icu)
      ? "advanced_care"
      : "nearest";

    return {
      hospital,
      distanceKm: distance,
      score,
      reason,
    };
  });

  options.sort((a, b) => a.score - b.score);

  const topOptions = options.slice(0, limit);
  const best = topOptions[0] || null;

  return best
    ? {
        hospital: best.hospital,
        distanceKm: best.distanceKm,
        score: best.score,
        options: topOptions,
      }
    : null;
};
