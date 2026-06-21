import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Sesudah (support both production & local)
app.enableCors({
  origin: [
    'http://localhost:3001',
    'https://solusiklik-crm.vercel.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
});

  await app.listen(3000);
}
bootstrap();
