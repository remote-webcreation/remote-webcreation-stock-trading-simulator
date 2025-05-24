import inquirer from 'inquirer';
import dotenv from 'dotenv';
dotenv.config();

import chalk from 'chalk';
import { getStockPriceData } from './api.js';
import { categories } from './symbols.js';
import { buyAsset, showPortfolio } from './portfolio.js';

async function mainMenu() {
  try {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose from the menu below:\n',
        choices: [
          'Show stock price',
          'Buy stock',
          'Sell stock',
          'Portfolio',
          'History',
          'Exit'
        ]
      }
    ]);

    switch (action) {
        
      case 'Show stock price':

        const { categoryName: showCategoryName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'categoryName',
            message: 'Choose a category:',
            choices: categories.map(cat => cat.name)
          }
        ]);

        // find category with name
        const showCategory = categories.find(cat => cat.name === showCategoryName);

        if (!showCategory.symbols || showCategory.symbols.length === 0) {
            console.log('\nNo symbols available in this category.\n');
            break;
        }

        //choose symbol
        const { symbol: showChoosenSymbol } = await inquirer.prompt([
            {
                type: 'list',
                name: 'symbol',
                message: 'Choose a symbol:',
                choices: showCategory.symbols.map(item => ({
                    name: `${item.name}`,
                    value: item.symbol
                })).concat([
                    new inquirer.Separator(),
                    { name: 'Manuell eingeben', value: '__manual__' }
                ])
            }
        ]);

        // manual input
        let finalShowSymbol = showChoosenSymbol;
        if (showChoosenSymbol === '__manual__') {
            const { manualSymbol } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'manualSymbol',
                    message: 'Enter stock/crypto symbol:'
                }
            ]);
            finalShowSymbol = manualSymbol;
        }

        // request price
        const priceData = await getStockPriceData(finalShowSymbol);


        if (priceData && typeof priceData.c === 'number' && typeof priceData.pc === 'number') {
            const diff = priceData.c - priceData.pc;
            let colorFunc = chalk.white;
            if (diff > 0) colorFunc = chalk.green;
            else if (diff < 0) colorFunc = chalk.red;
            console.log(
                `\nCurrent price of ${finalShowSymbol.toUpperCase()}: ${colorFunc(`$${priceData.c}`)}\n`
            );
        } else {
            console.log('\nCould not fetch price. Try another symbol.\n');
        }
        break;


      case 'Buy stock':

      // choose category
        const { categoryName: buyCategoryName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'categoryName',
                message: 'Choose a category to buy from:',
                choices: categories.map(cat => cat.name)
            },
        ]);
        
        const buyCategory = categories.find(cat => cat.name === buyCategoryName);

        if (!buyCategory.symbols || buyCategory.symbols.length === 0) {
            console.log('\nNo symbols available in this category to buy.\n'); 
            break; 
        }

        const { symbol: buyChoosenSymbol } = await inquirer.prompt([ 
            {
                type: 'list',
                name: 'symbol',
                message: 'Choose a symbol to buy:', 
                choices: buyCategory.symbols.map(item => ({
                    name: `${item.name}`,
                    value: item.symbol
                })).concat([
                    new inquirer.Separator(),
                    { name: 'Enter manually', value: '__manual__' } 
                ])
            }
        ]);

        let finalBuySymbol = buyChoosenSymbol; 
        if (buyChoosenSymbol === '__manual__') {
            const { manualSymbol } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'manualSymbol',
                    message: 'Enter stock/crypto symbol to buy:' 
                }
            ]);
            finalBuySymbol = manualSymbol;
        }

        const { amount } = await inquirer.prompt([
            {
                type: 'number',
                name: 'amount',
                message: `How many units of ${finalBuySymbol.toUpperCase()} do you want to buy?`, 
                validate: input => input > 0 ? true : 'Enter a positive number.'
            }
        ]);
        await buyAsset(finalBuySymbol, amount);
        break;

      case 'Sell stock':
        console.log("Feature coming soon!\n");
        break;
      case 'Portfolio':
        await showPortfolio();
        break;
      case 'History':
        console.log("Feature coming soon!\n");
        break;
      case 'Exit':
        process.exit();
    }
    await mainMenu();

  } catch (error) {
    if (error.isTtyError || error.message?.startsWith('User force closed the prompt')) {
      console.log('\nApplication closed.');
      process.exit();
    } else {
      console.error('An error occurred:', error);
      process.exit(1);
    }
  }
}
mainMenu();
