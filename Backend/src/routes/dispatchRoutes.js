import express from "express";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";
import {
  getQueue,
  assignAmbulance,
  updateIncidentStatus,
  getActiveIncidentForAmbulance,
  updateIncidentHospital,
  checkFirstResponders,
} from "../controllers/dispatchController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/check-first-responders", roleMiddleware("dispatcher", "admin"), checkFirstResponders);

router.get("/queue", roleMiddleware("dispatcher", "admin"), getQueue);
router.post("/assign", roleMiddleware("dispatcher", "admin"), assignAmbulance);
router.patch(
  "/incidents/:id/status",
  roleMiddleware("dispatcher", "admin", "paramedic", "driver"),
  updateIncidentStatus
);

router.patch(
  "/incidents/:id/hospital",
  roleMiddleware("dispatcher", "admin", "paramedic", "driver"),
  updateIncidentHospital
);

router.get(
  "/ambulances/:id/active",
  roleMiddleware("dispatcher", "admin", "paramedic", "driver"),
  getActiveIncidentForAmbulance
);

export default router;
