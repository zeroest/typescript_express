"use strict";
const config = {
    type: 'mysql',
    host: process.env.RDB_HOST,
    port: Number(process.env._PORT),
    username: process.env.RDB_USER,
    password: process.env.RDB_PASSWORD,
    database: process.env.RDB_DB,
    // synchronize: true,
    logging: true,
    entities: [
        __dirname + '/../**/*.entity{.ts,.js}',
    ],
    migrations: [
        'src/migrations/*.ts',
    ],
    cli: {
        migrationsDir: 'src/migrations',
    },
};
module.exports = config;
//# sourceMappingURL=ormconfig.js.map