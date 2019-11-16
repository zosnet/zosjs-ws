
//let olNode = "wss://bitshares.openledger.info/ws";
//let localNode = "ws://47.75.107.157:8290";

import {Apis} from "../index.js"

let localNode = "ws://47.75.107.157:8290";
/*
Apis.instance(localNode, true).init_promise.then(() => {
    Promise.all([
        Apis.instance().admin_api().exec("get_gateway", ["1.2.161","1.3.20"])
    ])
        .then(res => {
            console.log("res:", res);
        });
});
*/

Apis.instance(localNode, true).init_promise.then(() => {
    Promise.all([
        Apis.instance().mobile_api().exec("test", [])
    ])
        .then(res => {
            console.log("res:", res);
        });
});


/*Apis.instance(localNode, true).init_promise.then(() => {
    Promise.all([
        Apis.instance().db_api().exec("get_account_references", ["1.2.161"])
    ])
        .then(res => {
            console.log("res:", res);
        });
});*/

