module.exports = {
    save: {
        failure: {
            // For handling mongoose errors on model.save errbacks
            status: function (err) {
                return err.name === 'ValidationError' ? 400 : 500;
            }
        }
    }
};