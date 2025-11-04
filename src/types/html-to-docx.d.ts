declare module 'html-to-docx' {
  interface HTMLtoDOCXOptions {
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
    footer?: boolean;
    pageNumber?: boolean;
    font?: string;
    fontSize?: number;
    complexScriptSize?: number;
    header?: boolean;
    title?: string;
    subject?: string;
    creator?: string;
    description?: string;
    keywords?: string;
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
      header?: number;
      footer?: number;
      gutter?: number;
    };
  }

  function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    options?: HTMLtoDOCXOptions,
    footerHTMLString?: string | null
  ): Promise<Blob | Buffer | ArrayBuffer>;

  export default HTMLtoDOCX;
}
