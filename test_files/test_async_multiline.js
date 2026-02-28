class Test {
  static search = async (params) => {
    let queryString = await ArrayList.toQueryString(params);
    let response = await Url.get(
      `${endpoints().accountEntryReportAPI}/search`,
      queryString,
    );
    return response;
  };
}
