const MAX_LENGTHS = {
  nombre: 100,
  telefono: 30,
  correo: 120,
  tipo: 120,
  fecha: 20,
  mensaje: 1500,
};

function clean(value, maxLength = 500) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader('Location', location);
  res.end();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return redirect(res, '/contacto.html');
  }

  const body = req.body || {};

  // Campo trampa para bots.
  if (clean(body.website, 200)) {
    return redirect(res, '/gracias.html');
  }

  const nombre = clean(body.nombre, MAX_LENGTHS.nombre);
  const telefono = clean(body.telefono, MAX_LENGTHS.telefono);
  const correo = clean(body.correo, MAX_LENGTHS.correo);
  const tipo = clean(body.tipo, MAX_LENGTHS.tipo);
  const fecha = clean(body.fecha, MAX_LENGTHS.fecha);
  const mensaje = clean(body.mensaje, MAX_LENGTHS.mensaje);
  const acepta = clean(body.acepta, 10);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

  if (!nombre || !telefono || !emailOk || !tipo || !mensaje || acepta !== 'si') {
    return redirect(res, '/contacto.html?error=1#reservas');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || 'Oasis Pet Spa <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.error('Faltan RESEND_API_KEY o CONTACT_TO_EMAIL.');
    return redirect(res, '/contacto.html?error=3#reservas');
  }

  const text = [
    `Nombre: ${nombre}`,
    `Telefono / WhatsApp: ${telefono}`,
    `Correo: ${correo}`,
    `Tipo: ${tipo}`,
    `Fecha preferida: ${fecha || 'No indicada'}`,
    '',
    'Mensaje:',
    mensaje,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: correo,
        subject: `Nueva solicitud web - ${tipo}`,
        text,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('Error de Resend:', response.status, details);
      return redirect(res, '/contacto.html?error=2#reservas');
    }

    return redirect(res, '/gracias.html');
  } catch (error) {
    console.error('Error enviando el formulario:', error);
    return redirect(res, '/contacto.html?error=2#reservas');
  }
};
