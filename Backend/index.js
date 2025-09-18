import express from "express"
import cors from "cors"
import mongoose from  "mongoose"



const app = express();

app.use(cors(),express.json());


app.get("/",(req,res)=>{
    return res.json("API working");
})



app.listen(5000,()=>{
    console.log("server is running ")
})