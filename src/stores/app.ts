login: async (username, password, sucursalId?: number) => {
  set({ cargandoLogin: true });
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, usuario, rol, sucursal_id, activo, sucursales(nombre, region)")
    .eq("usuario", username.trim())
    .eq("password_hash", password)
    .eq("activo", true)
    .maybeSingle();
  if (error || !data) {
    set({ cargandoLogin: false });
    return null;
  }
  const authUser = {
    id: data.id,
    nombre: data.nombre,
    usuario: data.usuario,
    rol: data.rol as Rol,
    sucursal_id: sucursalId ?? data.sucursal_id,
    sucursalNombre: sucursalId
      ? get().sucursales.find(s => s.id === sucursalId)?.nombre
      : (data.sucursales as any)?.nombre,
    sucursalRegion: (data.sucursales as any)?.region ?? undefined,
  };
  set({ usuario: authUser, cargandoLogin: false, rolSimulado: null });
  localStorage.setItem("fc_user_json", JSON.stringify(authUser));
  return authUser;
},
