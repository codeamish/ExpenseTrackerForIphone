import express from 'express';
import cors from 'cors';
import {transactionRoutes} from './routes/transactionRoutes.js';
// Make the express app
const app = express();

// Use CORS middleware to allow cross-origin requests
app.use(cors());

// Use JSON middleware to parse JSON request bodies
app.use(express.json());



app.get("/", (req, res) => {
    res.json({
        message: "Expense Tracker API is running"
    });
});

app.use(
    "/api/transactions",
    transactionRoutes
);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});