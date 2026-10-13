# Backend - MongoDB Atlas Setup

આ પ્રોજેક્ટમાં Node.js, Express અને Mongoose સાથે MongoDB Atlas (Cloud Database) સેટઅપ કરેલું છે.

---

## 📌 MongoDB Atlas Connection String કેવી રીતે મેળવવી:

1. **MongoDB Atlas પર એકાઉન્ટ બનાવો / લોગિન કરો**:
   - વેબસાઇટ: [https://cloud.mongodb.com](https://cloud.mongodb.com)

2. **નવો ફ્રી ક્લસ્ટર બનાવો (Create Free Cluster)**:
   - **M0 (Free)** પ્લાન પસંદ કરો અને ક્લસ્ટર બનાવો.

3. **ડેટાબેઝ યુઝર બનાવો (Database Access)**:
   - ડાબી બાજુ **Database Access** પર ક્લિક કરો.
   - **Add New Database User** પર ક્લિક કરો.
   - Username અને એક મજબૂત Password સેટ કરો (આ Password યાદ રાખવો).

4. **નેટવર્ક એક્સેસ આપો (Network Access)**:
   - ડાબી બાજુ **Network Access** પર ક્લિક કરો.
   - **Add IP Address** -> **Allow Access from Anywhere** (`0.0.0.0/0`) પસંદ કરી Save કરો.

5. **Connection String કોપી કરો (Connect)**:
   - **Database** (Clusters) પર જાઓ.
   - તમારા ક્લસ્ટર પર **Connect** બટન પર ક્લિક કરો.
   - **Drivers** (Node.js) વિકલ્પ પસંદ કરો.
   - ત્યાં આપેલી Connection String કોપી કરો (ઉદાહરણ તરીકે: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`).

---

## ⚙️ પ્રોજેક્ટમાં સેટઅપ કરવાની રીત:

1. [`.env`](file:///d:/Backend/.env) ફાઇલ ખોલો:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://તમારો_યુઝરનેમ:તમારો_પાસવર્ડ@cluster0.xxxxx.mongodb.net/myDatabase?retryWrites=true&w=majority
   ```
   *(નોંધ: `<username>` અને `<password>` ની જગ્યાએ તમારો અસલી યુઝરનેમ અને પાસવર્ડ લખો).*

2. **કનેક્શન ટેસ્ટ કરો**:
   ```bash
   npm run test:db
   ```
   જો બધું સાચું હશે તો `🎉 Safal! MongoDB Atlas sathe connect thai gayu chhe` એવો મેસેજ આવશે.

3. **સર્વર શરૂ કરો**:
   ```bash
   npm run dev
   # અથવા
   npm start
   ```
   સર્વર `http://localhost:5000` પર શરૂ થશે.
