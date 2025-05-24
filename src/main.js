import inquirer from 'inquirer';
import chalk from 'chalk';
import { getStockPriceData } from './api.js';
import { categories } from './symbols.js';
import { buyAsset, showPortfolio } from './portfolio.js';

