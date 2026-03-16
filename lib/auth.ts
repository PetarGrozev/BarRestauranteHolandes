export async function sendMagicLink(email: string) {
  if (!email) throw new Error('Email required');
  // En producción reemplazar con servicio de correo verdadero.
  console.log(`Enviar "magic link" a ${email}`);
  return true;
}
