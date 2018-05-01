//bring in requirements
var inquirer = require('inquirer');
var chalk = require('chalk');
var mysql = require('mysql');
var formatUSD = require('format-usd')
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
    message: 'What department do you want to browse?',
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
                                    productDescription + "\nhas been placed.\nthe total cost was ") + chalk.yellow(formatUSD({amount: totalCost} )));
                                connection.end();
                            })
                        } else {
                            console.log(chalk.red('Insufficient Quantity!'))
                        }
                    } else {
                        console.log(chalk.red('the quantity must be a number'))
                    }
                } else {
                    console.log(chalk.red('item # not found'))
                }
            })
        })
    })  
}

