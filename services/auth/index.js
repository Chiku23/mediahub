import express from "express";
import prisma from "./prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { authenticateToken } from "./middleware/auth.js";

const app = express();
app.use(express.json());

// health check
app.get("/", (req, res) => {
    res.status(200).json({message: "Auth service running"});
});

app.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if(existingUser){
            return res.status(400).json({ error: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save new user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        return res.status(201).json({
            message: "User created successfully",
            userId: user.id
        });
    } catch (error) {
        return res.status(500).json({ error: "Server error" });
    }

});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        // Check if user already exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if(!user){
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if(!passwordMatch){
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWTSECRET,
            { expiresIn: "1d" } // token valid for 1 day
        );

        return res.json({
            message: "Login successful",
            token: token
        });
    } catch (error) {
        return res.status(500).json({ error: "Server error" });
    }
});

app.get("/verifyuser", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, createdAt: true }
  });

  res.json({ user });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Auth service running on port:`, PORT);
});
