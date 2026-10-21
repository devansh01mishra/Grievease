import express from "express"
import userRouter from "./routes/user_router.js"
import deptRouter from "./routes/dept_router.js"
import sysaRouter from "./routes/sysa_router.js"

// Initializes App
const app = express()
const port = process.env.PORT

// Setting up User router
app.use('/user', userRouter)

// Setting up Department router
app.use('/dept', deptRouter)

// Setting up Admin router
app.use('/sysa', sysaRouter)

// Running App
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})