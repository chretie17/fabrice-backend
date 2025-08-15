const mysql = require('mysql2');

class Database {
    constructor() {
        this.connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Admin@123',
            database: 'luz'
        });

        this.connection.connect(err => {
            if (err) throw err;
            console.log('Database connected!');
        });
    }

    getConnection() {
        return this.connection; // Return the raw connection object
    }
}

module.exports = new Database().getConnection();
