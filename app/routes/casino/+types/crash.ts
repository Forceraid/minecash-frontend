// Types for Crash game route
export namespace Route {
  export interface MetaArgs {
    data: any;
    params: any;
    location: any;
  }
}

export const meta = () => {
  return [
    { title: "Crash - MINECASH" },
    { name: "description", content: "Cash out before the crash! Test your timing in our exciting Crash game!" },
  ];
};
