import { redirect } from '@sveltejs/kit';

export function load({ params }: { params: any }) {
  throw redirect(302, `/submissions/${params.id}`);
}
