if (process.env.NODE_ENV) {
  require("dotenv").config({
    path: `${__dirname}/.env.${process.env.NODE_ENV}`
  });
} else {
  require("dotenv").config();
}
const app = require("./app");
const PORT = process.env.PORT || 3060;

//test

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
