# Three.js — Exemplo: Cubo Giratório

Exemplo mínimo que mostra um cubo giratório usando Three.js (módulo via CDN).

Como executar:

1. Abra um servidor estático no diretório `threejs-example` (recomendado):

```bash
# com Python 3
python -m http.server 8000

# ou com http-server (Node.js)
npx http-server -c-1 .
```

2. Abra `http://localhost:8000` no seu navegador.

Observações:
- Usamos import por módulo a partir do CDN `jsdelivr` para `three.module.js`.
- Se abrir o arquivo diretamente (`file://`) alguns navegadores podem restringir módulos; use o servidor acima.
