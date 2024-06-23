import { UserModel } from "../models/mysql/userModel.js";
import { validateUser } from "../schemas/user.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

export class UserController {
  static async register(req, res) {
    const result = validateUser(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "No se pudo validar el usuario" });
    }
    try {
      await UserModel.register({ input: req.body });
      const user = await UserModel.getByEmail({ email: req.body.email });
      const token = jwt.sign(
        {
          id: user.id,
        },
        process.env.TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "None",
        secure: isProduction,
      });

      res.json({ message: "Usuario creado", user });
    } catch (error) {
      const errorMessages = {
        "El email no puede estar vacío": 401,
        "La contraseña no puede estar vacía": 404,
        "El nombre de usuario no puede estar vacío": 401,
        "El correo electrónico ya está en uso": 400,
        "El nombre de usuario ya está en uso": 400,
      };

      const statusCode = errorMessages[error.message] || 500;
      const errorMessage = error.message || "Error interno del servidor";

      if (statusCode === 500) {
        console.error("Error al registrar usuario:", error);
      }

      res.status(statusCode).json({ message: errorMessage });
    }
  }

  static async login(req, res) {
    const result = validateUser(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "No se pudo validar el usuario" });
    }

    try {
      const user = await UserModel.login({
        email: req.body.email,
        password: req.body.password,
      });

      const token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "None",
        secure: isProduction,
      });

      const { password, ...safeUser } = user;

      res.json({ message: "Usuario logueado", user: safeUser });
    } catch (error) {
      const errorMessages = {
        "Credenciales inválidas": 401,
        "Este correo no está registrado": 404,
        "El correo electrónico o contraseña no coindicen": 401,
        "Ingrese su contraseña": 400,
      };

      const statusCode = errorMessages[error.message] || 500;
      const errorMessage = error.message || "Error en el servidor";

      if (statusCode === 500) {
        console.error("Error en el servidor:", error);
      }

      res.status(statusCode).json({ message: errorMessage });
    }
  }

  static async logout(req, res) {
    try {
      res.clearCookie("access_token", {
        httpOnly: true,
        sameSite: "None",
        secure: isProduction,
      });
      res.json({ message: "Usuario deslogueado" });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  static async verify(req, res) {
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ message: "No autenticado" });
    }

    try {
      const data = jwt.verify(token, process.env.TOKEN_SECRET);

      res.json({ data });
    } catch (error) {
      console.error("Error al verificar el token:", error);
      res.status(401).json({ message: "Token inválido" });
    }
  }
}
