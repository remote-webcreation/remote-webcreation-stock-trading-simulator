import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY;


export async function getStockPriceData(symbol) {
    try {
        if (!API_KEY) {
            throw new Error('FINNHUB_API_KEY is not defined in your .env file.');
        }
        const url = `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`;
        const response = await axios.get(url);

        if (
            response.data && 
            typeof response.data.c === 'number' &&
            typeof response.data.pc === 'number'
        ) {
            return response.data;
        } else {
            throw new Error('No price found for this symbol.');
        }
    } catch (error) {
        console.log('Error fetching stock price:', error.message);
        return null;
    }
    
}