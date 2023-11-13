export async function getUserWithToken(token: string): Promise<string> {
  const headers = new Headers();
  headers.set("Authorization", `${token}`);

  const response = await fetch("https://api.github.com/user", { headers });
  if (response.status !== 200) throw response
  
  const json = await response.json();

  return json.login as string;
}
