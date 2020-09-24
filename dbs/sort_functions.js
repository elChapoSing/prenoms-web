module.exports = {
    couch: {
        sort_key: (x, y) => x.key[0] < y.key[0] ? -1 : 1,
        sort_key_num: (x, y) =>  parseFloat(x.key[0]) - parseFloat(y.key[0]),
        sort_num: (x, y) => parseFloat(x) - parseFloat(y),
        sort_strategy_num: (x, y) => {
            let key_x = x.key;
            let key_y = y.key;
            if (key_x[0] !== key_y[0]) {
                return key_x[0] < key_y[0] ? -1 : 1;
            } else {
                if (key_x[1] !== key_y[1]) {
                    return key_x[1] < key_y[1] ? -1 : 1;
                } else {
                    if (key_x[2] !== key_y[2]) {
                        return key_x[2] < key_y[2] ? -1 : 1;
                    } else {
                        if (key_x[3] !== key_y[3]) {
                            return parseInt(key_x[3].split("-")[2]) < parseInt(key_y[3].split("-")[2]) ? -1 : 1;
                        } else {
                            return 0;
                        }
                    }
                }
            }
        },
        sort_strategy_num_level2: (x, y) => {
            let key_x = x.key;
            let key_y = y.key;
            return parseInt(key_x[1].split("-")[2]) > parseInt(key_y[1].split("-")[2]) ? -1 : 1;
        }
    },
    pg: {
        sort_num: (x, y) => parseFloat(x) - parseFloat(y),
    }
};