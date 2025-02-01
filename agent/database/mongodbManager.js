import mongoManager from './mongodb.js';

var activeDb;

export const initializeDB = async () => {
    await mongoManager.init();
    activeDb = mongoManager.db;
}

export const getDB = async () => {
    if (activeDb) {
        return activeDb;
    } else {
        await initializeDB();
        return activeDb;
    }
};