const express = require("express")
const app = express();
const cors = require('cors')
const pool = require("./db")
const bcrypt = require('bcrypt')
const JWT = require("jsonwebtoken")
require('dotenv').config()


app.use(cors())

app.use(express.json())

app.listen(5000, () => {
  console.log("servidor iniciado")
})





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
    res.json({ status: 200, message: 'cadastrado com sucesso' })
  }
  catch {
    res.json({ status: 400, message: 'Erro de cadastro' })
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
        next()
      }

    });
  }
};

app.get("/isAuth", verifyJWT, (req, res) => {
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
          }
          res.json({ auth: true, permissao, id, token })
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
      alert.err(err.message)
    }

  }
})

//get all clients
app.get("/todosclientes", verifyJWT, async (req, res) => {
  try {
    const allClientes = await pool.query(
      "SELECT * fROM crud.clientes ORDER BY cod_cliente ASC")
    res.json(allClientes.rows)
  } catch (err) {
    alert.err(err.message)
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
    alert.err(err.message)
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
    alert.err(err.message)
  }

})




//get one client
app.get("/unicocliente/:cpf", verifyJWT, async (req, res) => {
  const { cpf } = req.params;
  try {
    const oneCliente = await pool.query(
      "SELECT * fROM crud.clientes WHERE cpf = $1", [cpf])
    res.json(oneCliente.rows[0])
  } catch (err) {
    alert.err(err.message)
  }

})



//produtos
app.get("/produtos", async (req, res) => {
  try {
    const allProdutos = await pool.query(
      "SELECT * fROM crud.produtos ORDER BY id_produto ASC")
    res.json(allProdutos.rows)
  } catch (err) {
    alert.err(err.message)
  }

})


//pega um produto
app.get("/produtos/:id_produto", async (req, res) => {
  const { id_produto } = req.params;
  try {
    const produto = await pool.query(
      "SELECT * fROM crud.produtos WHERE id_produto = $1", [id_produto])
    res.json(produto.rows)
  } catch (err) {
    alert.err(err.message)
  }

})

// editar cliente
app.get("/edit/:cod_cliente", async (req, res) => {
  const { cod_cliente } = req.params;
  try {
    const edit = await pool.query(
      "SELECT * fROM crud.clientes WHERE cod_cliente = $1", [cod_cliente])
    res.json(edit.rows)
  } catch (err) {
    alert.err(err.message)
  }

})
//Upadte one client
app.put("/updatecliente/:cod_cliente", async (req, res) => {
  const { cod_cliente } = req.params;
  const { nome_cliente, sobrenome_cliente } = req.body;
  try {
    const updateCliente = await pool.query(
      "UPDATE crud.clientes  SET  nome_cliente = $2, sobrenome_cliente = $3 WHERE cod_cliente = $1",
      [cod_cliente, nome_cliente, sobrenome_cliente])
    res.status(200).send([`User updated with ID: ${cod_cliente}`])
  } catch (err) {
    alert.err(err.message)
  }

})

//delete one client
app.delete("/deletecliente/:cod_cliente", async (req, res) => {
  const { cod_cliente } = req.params;
  try {
    const deleteCliente = await pool.query(
      "DELETE fROM crud.clientes WHERE cod_cliente = $1", [cod_cliente])
    res.status(200).send(`User deleted with ID: ${cod_cliente}`)
  } catch (err) {
    alert.err(err.message)
  }

})










