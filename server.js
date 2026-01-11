
import express from 'express';
import http from 'http';
import pkg from 'pg';
import { Server } from 'socket.io';

const { Pool } = pkg;
const pool = new Pool({host:'db',user:'postgres',password:'truco',database:'trucobet'});

const app = express();
app.use(express.json());

app.get("/api/wallet/:id", async (req,res)=>{
  const {rows} = await pool.query("SELECT balance FROM wallets WHERE user_id=$1",[req.params.id]);
  res.json(rows[0]||{balance:0});
});

const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*"}});

let basePot = 4000;
let pot = basePot;

io.on("connection", socket=>{
  socket.emit("pot", pot);
  socket.on("call", c=>{
    const mult = {truco:3,seis:6,nove:9,doze:12}[c];
    if(mult) pot = basePot * mult;
    io.emit("pot", pot);
  });
});

server.listen(3001,()=>console.log("TRUCO BET rodando"));
