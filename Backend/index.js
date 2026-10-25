import express from "express"

import userRouter from "./routes/user_router.js"
import deptRouter from "./routes/dept_router.js"
import sysaRouter from "./routes/sysa_router.js"
import grivRouter from "./routes/griv_router.js"

// Initializes App
const app = express()
const port = process.env.PORT

// Convert request body to usable format
app.use(express.json())

// Setting up User router
app.use('/', userRouter)

// Setting up Department router
app.use('/dept', deptRouter)

// Setting up Admin router
app.use('/sysa', sysaRouter)

// Setting up Grievance router
app.use('/griv', grivRouter)

// Running App
app.listen(port, () => {
    console.log(`App listening on port http://localhost:${port}`)
})