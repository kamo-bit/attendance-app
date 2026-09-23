declare module "libheif-js/wasm-bundle" {
  type Pixels = { data: Uint8ClampedArray; width: number; height: number };
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    is_primary(): boolean;
    display(pixels: Pixels, callback: (result: Pixels | null) => void): void;
    free(): void;
  }
  const libheif: {
    ready?: Promise<unknown>;
    HeifDecoder: new () => {
      decode(input: Uint8Array): HeifImage[];
      decoder?: { delete(): void };
    };
  };
  export default libheif;
}

declare module "decode-ico" {
  type IcoImage = {
    width: number;
    height: number;
    data: Uint8Array | Uint8ClampedArray;
    type: "png" | "bmp";
  };
  export default function decodeIco(input: Uint8Array): IcoImage[];
}
