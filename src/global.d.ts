declare global {
    interface Window {
      PaystackPop: {
        setup: (config: any) => {
          openIframe: () => void;
        };
      };
    }
  }
  
  export {};