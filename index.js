const express = require("express")
const app = express();
const cors = require('cors')
const pool = require("./db")
const bcrypt = require('bcrypt')
const JWT = require("jsonwebtoken")
require('dotenv').config()
const multer = require('multer')
const path = require('path');
const { url } = require("inspector");
const { error } = require("console");


app.use(cors())

app.use(express.json())

app.listen(5000, () => {
  console.log("servidor iniciado")
})



const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.resolve("uploads"))
  },
  filename: (req, file, callback) => {
    const time = new Date().getTime();
    callback(null, `${time}_${file.originalname}`)
  }

})

const upload = multer({ storage: storage })

app.use('/files', express.static(path.resolve(__dirname, "uploads")))



//create new user
app.post("/newuser", async (req, res) => {
  const { nome, email, cpf, senha, permissao } = req.body
  try {
    let senhaCRPT = await bcrypt.hash(senha, 15);
    let dados = {
      nome: nome,
      email: email,
      cpf: cpf,
      senha: senhaCRPT,
      permissao
    }

    const newUser = await pool.query(
      'INSERT INTO crud.usuarios (nome, email, cpf, senha, permissao) VALUES ($1, $2, $3 , $4, $5) RETURNING*',
      [nome, email, cpf, senhaCRPT, permissao]
    )
    res.send({ status: 200, message: 'cadastrado com sucesso'})
  }
  catch {
    res.send({ status: 400, message: 'Erro de cadastro' })
  }

})

//valida token
const verifyJWT = (req, res, next) => {
  const token = req.headers["x-acess-token"]
  if (!token) {
    res.send("Falta o token")
  } else {
    JWT.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        res.json({ auth: false, message: "não autenticado" })
      } else {
        req.id = decoded.id
        req.permissao = decoded.permissao
        next()
      }
    });
  }
};

//teste
const verifyADM = (req, res, next) => {
  const token = req.headers["x-acess-token"]
  if (token != 'ADM') {
    res.send("err")
  } else {
    JWT.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        res.json({ auth: false, message: "não autenticado" })
      } else {
        req.permissao = decoded.permissao
        next()
      }
    });
  }
};
app.get("/isAuth", verifyADM, (req, res) => {
  res.send("tudo ok")
})

//login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const validaLogin = await pool.query(
      "SELECT email, permissao, id, nome, senha fROM crud.usuarios c WHERE c.email = $1", [email])
    if (validaLogin.rowCount > 0) {
      const id = validaLogin.rows[0].id
      const permissao = validaLogin.rows[0].permissao
      const validaSenha = await bcrypt.compare(password, validaLogin.rows[0].senha);
      if (validaSenha) {
        JWT.sign({ id, usuario: validaLogin.rows[0].nome }, process.env.SECRET_KEY, { algorithm: 'HS256' }, function (err, token) {
          if (err) {
            alert(err)
          } res.json({ auth: true, permissao, id, token })
        })
      }
      else {
        res.json({ status: 400, message: 'senha invalida' })
      }
    } else {
      res.json({ status: 400, message: 'email ou senha invalida' })
    }
  }
  catch {
    res.status(500).send()
  }
})



//create client
app.post("/clientes", async (req, res) => {

  if (req.body.cpf != "" && req.body.nome_cliente != "" && req.body.sobrenome_cliente != "") {
    try {
      const { cpf, nome_cliente, sobrenome_cliente } = req.body;
      const newClientes = await pool.query(
        'INSERT INTO crud.clientes (cpf, nome_cliente, sobrenome_cliente) VALUES ($1, $2, $3) RETURNING*',
        [cpf, nome_cliente, sobrenome_cliente]
      )
      res.json(newClientes)
    } catch (err) {
      res.json(err.message)
    }

  }
})

//get all clients
app.get("/todosclientes", verifyJWT, async (req, res) => {
  try {
    const allClientes = await pool.query(
      "SELECT * fROM crud.usuarios ORDER BY id ASC")
    res.json(allClientes.rows)
  } catch (err) {
    res.json(err.message)
  }

})

//get dados do id = id
app.get(`/unicocliente/:id`, verifyJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const oneUser = await pool.query(
      "SELECT * fROM crud.usuarios c WHERE c.id = $1", [id])
    res.json(oneUser.rows[0])
  } catch (err) {
    res.json(err.message)
  }

})






//pedidos do usuario

app.get("/pedidoscliente/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const Pedidos = await pool.query(
      "SELECT * fROM crud.pedidos p WHERE p.id_cliente = $1", [id])
    res.json(Pedidos.rows)
  } catch (err) {
    res.json(err.message)
  }

})




//get one client
app.get("/unicoclientecpf/:cpf", verifyJWT, async (req, res) => {
  const { cpf } = req.params;
  try {
    const oneCliente = await pool.query(
      "SELECT * fROM crud.usuarios WHERE cpf = $1", [cpf])
    res.json(oneCliente.rows[0])
  } catch (err) {
    res.json(err.message)
  }

})



//produtos
app.get("/produtos", async (req, res) => {
  try {
    const allProdutos = await pool.query(
      "SELECT * fROM crud.produtos ORDER BY id_produto ASC")
    res.json(allProdutos.rows)
  } catch (err) {
    res.json(err.message)
  }

})


//pega um produto
app.get("/produtos/:id_produto", async (req, res) => {
  const { id_produto } = req.params;
  try {
    const produto = await pool.query(
      "SELECT * fROM crud.produtos WHERE id_produto = $1", [id_produto])
    res.json([produto.rows])
  } catch (err) {
    res.json(err.message)
  }

})



//create product
app.post("/newproduct", upload.single('imagem'), async (req, res) => {


  try {
    const { descricao, preco } = req.body;
    const imagem = req.file.filename
    console.log(req.file)
    const newProduct = await pool.query(
      'INSERT INTO crud.produtos ( descricao, preco, imagem) VALUES ($1, $2, $3) RETURNING*',
      [descricao, preco, imagem]
    )
    res.json(newProduct)
  } catch (err) {
    res.json(err.message)
  }


})

// editar cliente
app.get("/edit/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const edit = await pool.query(
      "SELECT * fROM crud.usuarios WHERE id = $1", [id])
    res.json(edit.rows)
  } catch (err) {
    res.json(err.message)
  }

})
//Upadte one client
app.put("/updatecliente/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, cpf } = req.body;
  try {
    const updateCliente = await pool.query(
      "UPDATE crud.usuarios SET  nome = $2, cpf = $3 WHERE id = $1",
      [id, nome, cpf])
    res.status(200).send([`User updated with ID: ${id}`])
  } catch (err) {
    res.json(err.message)
  }

})

//delete one client
app.delete("/deletecliente/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deleteCliente = await pool.query(
      "DELETE fROM crud.usuarios WHERE id = $1", [id])
    res.status(200).send(`User deleted with ID: ${id}`)
  } catch (err) {
    res.json(err.message)
  }

})










//create order
app.post("/neworder/", async (req, res) => {


  try {

    const { descricao, id_produto, imagem, id_pedido, id_cliente, preco } = req.body;
    const newOrder = await pool.query(
      'INSERT INTO crud.pedidos (descricao, id_produto,imagem,id_pedido, id_cliente, preco) VALUES ($1, $2, $3,$4,$5,$6) RETURNING*',
      [descricao, id_produto, imagem, id_pedido, id_cliente, preco]
    )
   res.json({ status: 200, message: `PedidoNº${id_pedido} realizado ` })
    

  } catch (err) {
    res.json({status: 400, message: `cerifique de realizar login`})
  }


})


app.get("/lastpedido", async (req, res) => {

  try {
    const Lastpedido = await pool.query(
      "SELECT * fROM crud.pedidos ORDER BY id_pedido desc")
      if(!Lastpedido.rows[0]){
      res.status(200).send(Lastpedido.id_pedido='0')}
      else{ res.status(200).send(Lastpedido.rows[0].id_pedido)}
  } catch (err) {
    res.json(err.message)
  }

})

