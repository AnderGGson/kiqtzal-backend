// K'iq'tzal — Firmware del ESP32 (collector directo)
// --------------------------------------------------
// Lee 2x MQ-135 (calidad de aire) y 2x DHT11 (temp/humedad),
// arma el payload combinado { dirtyAir, cleanAir } y lo envía por HTTP
// al backend cada MEASURE_INTERVAL_MS milisegundos.
//
// Personalizar: WIFI_SSID, WIFI_PASSWORD, BACKEND_URL y los pines.
//
// Librerías (Arduino IDE / PlatformIO):
//   - DHT sensor library (Adafruit)
//   - Nota: no se usa timestamp: el backend asigna la hora del servidor.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ====== CONFIGURACION (editar) ======
#define WIFI_SSID          "nombre-de-tu-red"
#define WIFI_PASSWORD      "clave-de-tu-red"
#define BACKEND_URL        "https://kiqtzal-api.onrender.com"  // SIN "/api"
#define MEASURE_INTERVAL_MS 5000UL

// Sensores "ARRIBA" = entrada del biofiltro = dirtyAir (aire sucio)
// Sensores "ABAJO"  = salida del biofiltro  = cleanAir (aire limpio)
#define MQ135_ARRIBA_PIN 32  // ADC1_CH4
#define MQ135_ABAJO_PIN  34  // ADC1_CH6
#define DHTPIN_ARRIBA    4   // GPIO digital (con pull-up 10k)
#define DHTPIN_ABAJO     27  // GPIO digital (con pull-up 10k)

DHT dhtArriba(DHTPIN_ARRIBA, DHT11);
DHT dhtAbajo(DHTPIN_ABAJO, DHT11);

unsigned long lastRun = 0;

float gasArribaLast = 0;
float gasAbajoLast = 0;
float tempArribaLast = 0;
float humArribaLast = 0;
float tempAbajoLast = 0;
float humAbajoLast = 0;

float avgAnalog(int pin, int samples = 10) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(5);
  }
  return (float)sum / samples;
}

void sendMeasurement() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi no conectado, se omite el envio");
    return;
  }

  String payload = String("{\"dirtyAir\":{\"gas\":") + String(gasArribaLast, 1) +
                   ",\"humidity\":" + String(humArribaLast, 1) +
                   ",\"temperature\":" + String(tempArribaLast, 1) + "}," +
                   "\"cleanAir\":{\"gas\":" + String(gasAbajoLast, 1) +
                   ",\"humidity\":" + String(humAbajoLast, 1) +
                   ",\"temperature\":" + String(tempAbajoLast, 1) + "}}";

  const bool useHttps = String(BACKEND_URL).startsWith("https://");
  HTTPClient http;

  if (useHttps) {
    WiFiClientSecure client;
    client.setInsecure();  // demo: no se valida el certificado SSL
    if (http.begin(client, String(BACKEND_URL) + "/api/measurements")) {
      http.addHeader("Content-Type", "application/json");
      int code = http.POST(payload);
      Serial.printf("POST https -> HTTP %d\n", code);
      http.end();
    }
  } else {
    if (http.begin(String(BACKEND_URL) + "/api/measurements")) {
      http.addHeader("Content-Type", "application/json");
      int code = http.POST(payload);
      Serial.printf("POST http -> HTTP %d\n", code);
      http.end();
    }
  }
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);  // apaga el brownout detector

  Serial.begin(115200);
  dhtArriba.begin();
  dhtAbajo.begin();
  pinMode(MQ135_ARRIBA_PIN, INPUT);
  pinMode(MQ135_ABAJO_PIN, INPUT);
  analogReadResolution(12);  // ADC de 12 bits: 0..4095

  Serial.println("K'iq'tzal firmware iniciando...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("Conectado, IP local: %s\n", WiFi.localIP().toString().c_str());

  // Dejar calentar los MQ-135 unos 5 minutos antes de la demo.
  Serial.println("Sensores calentandose (5 min aprox). Enviando mediciones...");
}

void loop() {
  if (millis() - lastRun >= MEASURE_INTERVAL_MS) {
    lastRun = millis();

    float gasArriba = avgAnalog(MQ135_ARRIBA_PIN);
    float gasAbajo = avgAnalog(MQ135_ABAJO_PIN);

    float humArriba = dhtArriba.readHumidity();
    float tempArriba = dhtArriba.readTemperature();
    float humAbajo = dhtAbajo.readHumidity();
    float tempAbajo = dhtAbajo.readTemperature();

    // Si un DHT falla (NaN), se reutiliza la última lectura buena
    // para no romper el JSON.
    if (!isnan(humArriba)) humArribaLast = humArriba;
    if (!isnan(tempArriba)) tempArribaLast = tempArriba;
    if (!isnan(humAbajo)) humAbajoLast = humAbajo;
    if (!isnan(tempAbajo)) tempAbajoLast = tempAbajo;
    gasArribaLast = gasArriba;
    gasAbajoLast = gasAbajo;

    Serial.printf("gas sucio=%.1f limpio=%.1f | hum %.1f/%.1f | temp %.1f/%.1f\n",
                  gasArribaLast, gasAbajoLast,
                  humArribaLast, humAbajoLast,
                  tempArribaLast, tempAbajoLast);

    sendMeasurement();
  }
}