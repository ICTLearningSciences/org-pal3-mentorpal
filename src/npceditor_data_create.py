import csv
import pandas as pd


def export_npceditor():
    csvpath="data/Full_Dataset - Sheet1.csv"
    csv_df=pd.read_csv(csvpath)
    csv_df = csv_df.fillna('')
    data=[]
    for i in range(0,len(csv_df)):
        row={}
        row['ID']='A'+str(i+1)
        row['text']=csv_df.iloc[i]['Answer']
        row['question']=csv_df.iloc[i]['Question']+'\r\n'+csv_df.iloc[i]['P1']+'\r\n'+\
                        csv_df.iloc[i]['P2']+'\r\n'+csv_df.iloc[i]['P3']+'\r\n'+\
                        csv_df.iloc[i]['P4']+'\r\n'+csv_df.iloc[i]['P5']+'\r\n'+\
                        csv_df.iloc[i]['P6']+'\r\n'+csv_df.iloc[i]['P7']+'\r\n'+\
                        csv_df.iloc[i]['P8']+'\r\n'+csv_df.iloc[i]['P9']+'\r\n'+\
                        csv_df.iloc[i]['P10']
        data.append(row)
        
    excel_df=pd.DataFrame(data,columns=['ID','text','question'])
    excel_writer=pd.ExcelWriter('data/NPCEditor_data.xlsx')
    excel_df.to_excel(excel_writer,'Sheet1', index=False)
    excel_writer.save()

if __name__=='__main__':
    export_npceditor()