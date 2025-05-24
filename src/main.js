import inquirer from 'inquirer';
import dotenv from 'dotenv';
dotenv.config();
import { fetchData } from './api.js';
fetchData();
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

        const { categoryName } = await inquirer.prompt([
          {
            type: 'list',
            name: 'categoryName',
            message: 'Choose a category:',
            choices: categories.map(cat => cat.name)
          }
        ]);

        // find category with name
        const category = categories.find(cat => cat.name === categoryName);

        if (!category.symbols || category.symbols.length === 0) {
            console.log('\nNo symbols available in this category.\n');
            break;
        }

        //choose symbol
        const { symbol: choosenSymbol } = await inquirer.prompt([
            {
                type: 'list',
                name: 'symbol',
                message: 'Choose a symbol:',
                choices: category.symbols.map(item => ({
                    name: `${item.name} (${item.symbol})`,
                    value: item.symbol
                })).concat([
                    new inquirer.Separator(),
                    { name: 'Manuell eingeben', value: '__manual__' }
                ])
            }
        ]);

        // manual input
        let finalSymbol = choosenSymbol;
        if (choosenSymbol === '__manual__') {
            const { manualSymbol } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'manualSymbol',
                    message: 'Enter stock/crypto symbol:'
                }
            ]);
            finalSymbol = manualSymbol;
        }

        // request price
        const priceData = await getStockPriceData(finalSymbol);

        console.log('API response:', priceData);

        if (priceData && typeof priceData.c === 'number' && typeof priceData.pc === 'number') {
            const diff = priceData.c - priceData.pc;
            let colorFunc = chalk.white;
            if (diff > 0) colorFunc = chalk.green;
            else if (diff < 0) colorFunc = chalk.red;
            console.log(
                `\nCurrent price of ${finalSymbol.toUpperCase()}: ${colorFunc(`$${priceData.c}`)}`
            );
        } else {
            console.log('\nCould not fetch price. Try another symbol.\n');
        }
        break;
      case 'Buy stock':

      // choose category
        const { buySymbol, amount } = await inquirer.prompt([
            {
                type: 'input',
                name: 'buySymbol',
                message: 'Enter the symbol you want to buy:'
            },
            {
                type: 'number',
                name: 'amount',
                message: 'How many units do you want to buy?',
                validate: input => input > 0 ? true : 'Enter a positive number.'
            }
        ]);
        await buyAsset(buySymbol, amount);
        break;
      case 'Sell stock':
        console.log("Feature coming soon!\n");
        break;
      case 'Portfolio':
        await showPortfolio();
        break;
      case 'Show history':
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
