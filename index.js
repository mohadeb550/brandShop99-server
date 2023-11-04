const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');


// use middleWare 

app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())

// token verify middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if(!token){
    return res.status(401).send({message : 'token not found'})
  }
  if(token){
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error , decoded) => {
      if(error){return res.status(401).send({message : 'Your Token is invalid'})}
      req.user = decoded;
      next();
    })
  }
}



// mongoDB connection 
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.vn1kdxv.mongodb.net/?retryWrites=true&w=majority`;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {

  try {
    // await client.connect();

    const companyCollection = client.db('brandShop').collection('companies');
    const cartCollection = client.db('brandShop').collection('cart');
    const productCollection = client.db('brandShop').collection('products');



    // get all brand 
    app.get('/companies', async (req, res)=>{
      const companies = await companyCollection.find().toArray();
      res.send(companies)
    })

    // generate a jwt token for user
    app.post('/generate-token', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.cookie('token', token, { httpOnly: true, secure: false})
      .send('cookie send successfully with token')
    })

    // logout 
    app.post('/logout', async (req, res ) => {
      const userEmail = req.body;
    
      res.clearCookie('token', {maxAge: 0})
      .send('token cookie deleted')
    })
    
    // get specific single brand data
    
    app.get('/products/:brand', async (req, res) =>{
      const brand = req.params.brand;
      const query = { brandName : brand}
      const products = await productCollection.find(query).toArray();
      res.send(products);
    })
    

    // get single product data from specific brand collection

    app.get('/details/:id', async (req, res)=> {
      const productId = req.params;
      const query = { _id : new ObjectId(productId)};
      const foundProduct = await productCollection.findOne(query);
      res.send(foundProduct)
    })


    // create a new product on specific brand

    app.post('/add-product', async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    })


 
    // products add in cart
    app.post('/product', async (req, res) => {
      const newProduct = req.body;
      const result = await cartCollection.insertOne(newProduct);
      res.send(result)
    })

    //  get all items in cartItems
    app.get('/cart', verifyToken,  async (req, res)=> {

      const userEmail = req.query.email;

      const query = { email : userEmail }
      const foundCartItems = await cartCollection.find(query).toArray();
      res.send(foundCartItems)
    })

    // delete single item from cart
    app.delete('/item/:id', async (req, res) => {
      const itemId = req.params;
      const query = { _id : new ObjectId(itemId)};
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })

    // update partially changes specific product

    app.patch('/update-product/:id', async (req, res) => {
      const productId = req.params;
      const newChanges = req.body;
      const query = { _id : new ObjectId(productId)};
      const updatedProduct = {
        $set : newChanges
      }
      const result = await productCollection.updateOne(query, updatedProduct);
      res.send(result)
    })


    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Server is running now');
})

app.listen(port, ()=>{
    console.log('server running on port', port)   
})