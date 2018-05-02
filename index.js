//bring in requirements
var inquirer = require('inquirer');
var chalk = require('chalk');
var mysql = require('mysql');
var formatUSD = require('format-usd')
var table = require('cli-table')
//create database connection
var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    // Your username
    user: "root",
    // Your password
    password: "root",
    database: "bamazon_db"
});

connection.connect(function (err) {
    if (err) throw err;
    //console.log("database connection succesful")
    login() //call next function
});

var IDInput = {
    type: 'list',
    name: 'IDinput',
    message: 'How do you want to log in?',
    choices: ['User', 'Manager', 'Supervisor']
};

function login() {
    inquirer.prompt(IDInput).then(function (answer) {
        switch (answer.IDinput) {
            case 'User':
                userPrompts();
                break;
            case 'Manager':
                managerPrompts();
                break;
            case 'Supervisor':

                break;
        }

    });
}
//returns the unique department names in alphabetical order
function departments() {
    var queryString = 'SELECT distinct department_name from products order by department_name asc'
    var departmentsArray = []
    connection.query(queryString, function (err, res) {
        if (err) throw err;
        //console.log(res)
        for (var i = 0; i < res.length; i++) {
            //console.log(res[i].department_name)
            departmentsArray.push(String(res[i].department_name))
        }


    })
    return departmentsArray;
}
// object for 1st input (choose department to browse)
var departmentInput = {
    type: 'list',
    name: 'depInput',
    message: 'What department?',
    choices: departments()
}

var indexInput = [{
        type: 'input',
        name: 'iInput',
        message: 'input the item # of the product you wish to purchase'
    },
    {
        type: 'input',
        name: 'qtyInput',
        message: 'What quantity?'
    }
]

function userPrompts() {
    inquirer.prompt(departmentInput).then(function (answer) {
        var queryString2 = "SELECT item_id, product_name, price, stock_quantity FROM products WHERE department_name = ? ORDER BY product_name ASC"
        var departmentChosen = answer.depInput
        connection.query(queryString2, [departmentChosen], function (err, res) {
            if (err) throw err;
            //console.log(res)
            var indexArray = []
            for (var i = 0; i < res.length; i++) {
                console.log(chalk.yellow('item #: ' + res[i].item_id) + chalk.blue(" Name: " + res[i].product_name) + chalk.green(" Price: " + formatUSD({
                    amount: res[i].price
                })))
                indexArray.push(res.item_id)
            }
            inquirer.prompt(indexInput).then(function (answer) {
                // validates input of index
                var quantity;
                var price;
                var idChosen;
                var productDescription = "";
                var newQuantity;
                var totalCost;

                var match = false;
                for (var j = 0; j < res.length; j++) {
                    if (answer.iInput == res[j].item_id) {
                        idChosen = res[j].item_id
                        quantity = res[j].stock_quantity
                        productDescription = res[j].product_name
                        price = res[j].price;
                        match = true;
                    }
                }
                if (match) {
                    if (Number.isInteger(parseInt(answer.qtyInput))) {
                        if (quantity >= answer.qtyInput) {
                            totalCost = answer.qtyInput * price
                            newQuantity = parseInt(quantity) - parseInt(answer.qtyInput);
                            connection.query('UPDATE products SET stock_quantity = ? WHERE item_id = ?', [newQuantity, idChosen], function (err, res) {
                                if (err) throw err;
                                console.log(chalk.green("Congratulations! Your order for " + answer.qtyInput + " " +
                                    productDescription + "\nhas been placed.\nthe total cost was ") + chalk.yellow(formatUSD({
                                    amount: totalCost
                                })));
                                connection.end();
                            })
                        } else {
                            console.log(chalk.red('Insufficient Quantity!'))
                            connection.end();
                        }
                    } else {
                        console.log(chalk.red('the quantity must be a number'))
                        connection.end();
                    }
                } else {
                    console.log(chalk.red('item # not found'))
                    connection.end();
                }
            })
        })
    })
}

//***********Manager functionality */

function managerPrompts() {
    var managerInput = {
        type: 'list',
        name: 'manInput',
        message: 'What do you want to do?',
        choices: ['View low inventory', 'Add to inventory', 'Add new product', 'Log out']
    }

    inquirer.prompt(managerInput).then(function (answer) {
        switch (answer.manInput) {
            case 'View low inventory':
                viewLowInventory();
                break;
            case 'Add to inventory':
                displayInventory()
                addToInventory();
                break;
            case 'Add new product':
                addNewItem()
                break;
            case 'Log out':
                connection.end();
                break;
        }
    });
}

function viewLowInventory() {
    var queryString3 = "SELECT * FROM products WHERE stock_quantity <= (full_quantity / 2)  ORDER BY department_name, product_name ASC"
    connection.query(queryString3, function (err, res, fields) {
        if (err) throw err;
        let inventoryTable = new table({
            head: fields.map(field => field.name)
        })
        for (var i = 0; i < res.length; i++) {
            inventoryTable.push([res[i].item_id, res[i].product_name,
                res[i].department_name, formatUSD({
                    amount: res[i].price
                }),
                res[i].stock_quantity, res[i].full_quantity
            ])
        }
        console.log(inventoryTable.toString());
        managerPrompts();
    });
}

function displayInventory() {
    var queryString4 = "SELECT item_id, product_name, stock_quantity, full_quantity FROM products ORDER BY item_id ASC"
    connection.query(queryString4, function (err, res) {
        for (var i = 0; i < res.length; i++) {
            console.log(chalk.green("Product ID: " + res[i].item_id) +
                chalk.blue(" Name: " + res[i].product_name) +
                chalk.red(" Current Stock: " + res[i].stock_quantity) +
                chalk.green(" Full quantity: " + res[i].full_quantity))
        };
    });
}

function addToInventory() {
    var InputRestock = [{
            type: 'input',
            name: 'iInput',
            message: 'Input the Product ID # of the product you wish to re-stock'
        },
        {
            type: 'input',
            name: 'qtyInput',
            message: 'What quantity?'
        }
    ]
    inquirer.prompt(InputRestock).then(function (answer) {
        var id = answer.iInput;
        var quantity = answer.qtyInput;
        var queryString5 = "UPDATE products SET stock_quantity = stock_quantity + ? WHERE item_id = ?"
        connection.query(queryString5, [parseInt(quantity), id], function (err, res) {
            if (err) throw err;
            console.log(chalk.green("Udate was succesful"))
            managerPrompts();
        });
    });
}

var newItemInput = [{
        type: 'list',
        name: 'depinput',
        message: 'What department?',
        choices: departments()
    },

    {
        type: 'input',
        name: 'iname',
        message: 'What is the product name?'
    },
    {
        type: 'input',
        name: 'icurrentinventory',
        message: 'What is the current quantity in stock?'
    },
    {
        type: 'input',
        name: 'imaxinventory',
        message: 'What is the normal quantity to stock?'
    },
    {
        type: 'input',
        name: 'iprice',
        message: 'What is the retail price?'
    }
]

function addNewItem() {
    inquirer.prompt(newItemInput).then(function (answer) {
        var queryString6 = "INSERT INTO products (product_name, department_name, price, stock_quantity, full_quantity) " +
            "VALUES(?,?,?,?,?)"
        connection.query(queryString6, [answer.iname, answer.depinput, answer.iprice, answer.icurrentinventory, answer.imaxinventory], function (err, res) {
            if (err) throw err;
            console.log(chalk.green("Item added succesfully"))
            managerPrompts();
        });
    });
}