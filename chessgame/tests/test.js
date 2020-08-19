var chai = require("chai");
var chaiHttp = require("chai-http");
var app = require("../app.js").app;

chai.use(chaiHttp); //configures chai for http

suite(">>> Running chai tests on the server", function(){
  test("Test user connecting", function(){
    chai.request('http://localhost:3000').post("/testConnection/").set('content-type', 'application/x-www-form-urlencoded').send({id:"testID"}).end(function(err, res){
      var id = "testID";
      chai.assert.equal(res.status, 200);
      chai.assert.equal(res.body[id].userId, "testID");
      chai.assert.equal(res.body[id].userName, "TestName");
    });
  });
});
