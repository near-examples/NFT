FROM gitpod/workspace-full

RUN bash -cl "rustup toolchain install stable && rustup target add wasm32-unknown-unknown"

RUN bash -c ". .nvm/nvm.sh \
             && nvm install v16 && nvm alias default v16"