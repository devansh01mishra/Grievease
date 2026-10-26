import { Router } from "express";
import { getDept, getDeptUser } from "../test/test_database";

const deptRouter = Router()

deptRouter.post("/", async (req, res) => {
    const { name, email, dept, password } = req.body;
    const deptRecord = await getDept(dept); // TODO

    if (!deptRecord.id) {
        return res.status(401).json({
            success: false,
            message: 'No department with such credentials exist!'
        });
    }

    const userRecord = await getDeptUser(deptRecord, name, email); // TODO

    if (!checkPassword(password, userRecord.password)) {
        return res.status(401).json({
            success: false,
            message: 'Incorrect access credentials!'
        });
    }

    return res.status(200).json({
        id: deptRecord.id,
        dept: deptRecord.name,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role
    });
})

deptRouter.get("/grievances", (req, res) => {
    // TODO: to return grievances particular to this department and permitted to the logged in employ of the department
})

deptRouter.get("/notifactions", (req, res) => {
    // TODO: to return notifactions for grievances particular to this department and permitted to the logged in employ of the department
})

deptRouter.put("/grievances/:id", (req, res) => {
    // TODO: to work on a grievance with id if permitted
})

deptRouter.delete("/grievances/:id", (req, res) => {
    // TODO: to delete on a grievance with id if permitted
})

export default deptRouter;