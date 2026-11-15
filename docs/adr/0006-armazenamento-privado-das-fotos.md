# 0006. Armazenamento privado das fotos das notas atrás de uma interface

Data: 2026-11-15
Status: aceito

## Contexto

As notas fiscais em papel são registradas por foto (RF09). As fotos devem ficar em armazenamento privado e só podem ser acessadas pelo back-end autenticado (RNF06, RN31). O acesso ao armazenamento deve ser isolado para permitir trocar de provedor (RNF14).

A hospedagem final ainda não está definida, e o plano gratuito da Vercel tem limites de uso, conforme as premissas do documento de requisitos.

## Decisão

- A camada de aplicação depende de uma interface `PhotoStorage`, com as operações `save(conteudo, tipo) -> chave`, `open(chave)` e `delete(chave)`.
- Nesta entrega a implementação é `LocalPhotoStorage`. Ela grava em um diretório privado configurado por `UPLOAD_DIR`, fora de qualquer pasta servida como estática, e esse diretório é um volume no Docker.
- A chave é gerada pelo servidor: `<propriedade_id>/<uuid>.<extensão>`. O nome enviado pelo usuário nunca é usado como caminho.
- O banco guarda apenas a chave e o tipo, em `nota_fiscal.imagem_caminho` e `imagem_mime`, e nunca uma URL pública.
- A foto é baixada por um endpoint autenticado sob a propriedade, `GET /properties/{id}/invoices/{nota_id}/photo`, que confere o vínculo (ADR 0002) antes de ler o arquivo.
- O upload aceita apenas JPEG, PNG e WebP, com limite de tamanho. O front-end reduz a imagem antes do envio (RNF07).

## Alternativas consideradas

- **Guardar a imagem no banco (`bytea`):** é simples de fazer backup, mas aumenta o banco e o tráfego de cada consulta. Além disso, contraria o modelo, que guarda só o caminho.
- **Serviço em nuvem desde já** (Vercel Blob privado, S3): é a opção mais adequada à produção, mas exige conta, credenciais e custo antes de a hospedagem estar definida.
- **Pasta pública com nome difícil de adivinhar:** qualquer pessoa com o link veria a nota, o que viola o RNF06.

## Consequências

- Trocar de provedor é escrever outra implementação da interface e mudar a configuração, sem tocar nos casos de uso.
- O teste de acesso negado à foto de outra propriedade é obrigatório (pacote 6).
- Em uma hospedagem sem disco persistente, a implementação local não serve. Nesse caso será preciso implementar o provedor em nuvem antes da implantação.
- O backup das fotos fica separado do backup do banco.
