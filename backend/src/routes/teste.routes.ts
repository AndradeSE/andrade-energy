import { Router } from "express";
import { supabase } from "../config/supabase";

const router = Router();

router.get("/", async (_, res) => {

  const { data, error } =
    await supabase
      .from("clientes")
      .select("*")
      .limit(5);

  if (error)
    return res.status(500).json(error);

  return res.json(data);

});

export default router;